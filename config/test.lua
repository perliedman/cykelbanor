function slope_speed(way_info, base_speed, forward)
    local distance
    local climb_distance
    local desc_distance
    local climb_factor
    local desc_factor

    distance = way_info["distance"]

    if not forward then
        climb_distance = way_info["climbDistance"]
        desc_distance = way_info["descentDistance"]
        climb_factor = climb_distance / distance
        desc_factor = desc_distance / distance
        climb = way_info["climb"]
        descent = way_info["descent"]
    else
        desc_distance = way_info["climbDistance"]
        climb_distance = way_info["descentDistance"]
        desc_factor = desc_distance / distance
        climb_factor = climb_distance / distance
        descent = way_info["climb"]
        climb = way_info["descent"]
    end

    local remain_factor = 1 - (climb_factor + desc_factor)
    local climb_gradient = climb_distance > 0 and climb / climb_distance / 1000 or 0
    local desc_gradient = desc_distance > 0 and -descent / desc_distance / 1000 or 0
    local climb_speed = speed(climb_gradient, base_speed)
    local desc_speed = speed(desc_gradient, base_speed)

    print(string.format('descent: %f',descent))
    print(string.format('climb: %f',climb))
    print(string.format('distance: %f',distance))
    print(string.format('climb_speed: %f',climb_speed))
    print(string.format('desc_speed: %f',desc_speed))
    print(string.format('climb_factor: %f', climb_factor))
    print(string.format('desc_factor: %f', desc_factor))
    print(string.format('remain_factor: %f', remain_factor))
    print('---')

    return base_speed * remain_factor + climb_speed * climb_factor + desc_speed * desc_factor
end

function speed(g, base_speed)
   if g>0 then
      return math.max(math.min(base_speed, 3),base_speed-100*g)
   else
      return math.min(math.max(base_speed, 50),base_speed-50*g)
   end
end

cjson = require('cjson')
require("config/lib/elevation")
slope_file = io.open( '/home/per/Documents/geodata/map_slope.json', "r" )
contents = slope_file:read( "*a" )
slope_table = cjson.decode(contents);
io.close( slope_file )
print(slope_speed(slope_table['142686681'], 15, true))
print(Elevation.slope_speed(slope_table['142686681'], 15, true))
print('====')
print(slope_speed(slope_table['142686681'], 15, false))
print(Elevation.slope_speed(slope_table['142686681'], 15, false))
